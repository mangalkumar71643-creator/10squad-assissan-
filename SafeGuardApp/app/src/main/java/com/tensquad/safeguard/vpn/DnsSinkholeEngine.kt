package com.tensquad.safeguard.vpn

import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.tensquad.safeguard.data.BlocklistRepository
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Reads raw IP packets from the TUN interface, and for any packet addressed
 * to one of the device's DNS servers (the only IPs routed into this VPN --
 * see SafeGuardVpnService), decides whether to answer with NXDOMAIN
 * (blocked domain) or transparently forward the query to the real resolver.
 *
 * Only UDP is handled. TCP packets to those DNS IPs (used for DNS-over-TLS
 * on port 853, or the rare truncated-response TCP:53 fallback) are dropped
 * rather than relayed -- see README "Known limitations". Everything outside
 * the narrowly-routed DNS IPs never reaches this engine at all, since it
 * isn't captured by the VPN's routes in the first place.
 */
class DnsSinkholeEngine(
    private val vpnService: VpnService,
    private val tunFd: ParcelFileDescriptor,
    private val blocklist: BlocklistRepository,
    private val running: AtomicBoolean
) {
    private val executor: ExecutorService = Executors.newCachedThreadPool()
    private val ipIdCounter = AtomicInteger(1)
    private val writeLock = Any()

    fun run() {
        val input = FileInputStream(tunFd.fileDescriptor)
        val output = FileOutputStream(tunFd.fileDescriptor)
        val buffer = ByteArray(32000)

        try {
            while (running.get()) {
                val length = try {
                    input.read(buffer)
                } catch (e: Exception) {
                    if (running.get()) Log.w(TAG, "tun read error", e)
                    break
                }
                if (length <= 0) continue

                val packet = buffer.copyOf(length)
                try {
                    handlePacket(packet, output)
                } catch (e: Exception) {
                    Log.w(TAG, "packet handling error", e)
                }
            }
        } finally {
            executor.shutdownNow()
        }
    }

    private fun handlePacket(packet: ByteArray, output: FileOutputStream) {
        if (packet.isEmpty()) return
        val version = (packet[0].toInt() shr 4) and 0xF
        if (version != 4) return // IPv6 not handled in this MVP

        val ihl = (packet[0].toInt() and 0xF) * 4
        if (packet.size < ihl + 8) return
        val protocol = packet[9].toInt() and 0xFF
        if (protocol != 17) return // only UDP handled; TCP/ICMP dropped, see class doc

        val srcIp = packet.copyOfRange(12, 16)
        val dstIp = packet.copyOfRange(16, 20)
        val udpOffset = ihl
        val srcPort = ((packet[udpOffset].toInt() and 0xFF) shl 8) or (packet[udpOffset + 1].toInt() and 0xFF)
        val dstPort = ((packet[udpOffset + 2].toInt() and 0xFF) shl 8) or (packet[udpOffset + 3].toInt() and 0xFF)
        val udpLength = ((packet[udpOffset + 4].toInt() and 0xFF) shl 8) or (packet[udpOffset + 5].toInt() and 0xFF)
        val payloadOffset = udpOffset + 8
        val payloadLength = (udpLength - 8).coerceAtLeast(0)
        if (payloadOffset + payloadLength > packet.size) return
        val payload = packet.copyOfRange(payloadOffset, payloadOffset + payloadLength)

        if (dstPort == 53) {
            executor.execute { handleDnsQuery(payload, srcIp, dstIp, srcPort, output) }
        } else {
            val dstAddress = InetAddress.getByAddress(dstIp)
            executor.execute { handleGenericUdp(payload, srcIp, dstIp, srcPort, dstPort, dstAddress, output) }
        }
    }

    private fun handleDnsQuery(query: ByteArray, srcIp: ByteArray, dstIp: ByteArray, srcPort: Int, output: FileOutputStream) {
        if (query.size < 12) return
        val hostname = try { parseQuestionName(query) } catch (e: Exception) { null }

        val safeSearchTarget = hostname?.let { forcedSafeSearchTargetFor(it) }
        if (safeSearchTarget != null) {
            val response = try { buildSafeSearchResponse(query, safeSearchTarget, dstIp) } catch (e: Exception) { null }
            if (response != null) {
                val responsePacket = PacketBuilder.buildUdpIpv4Packet(
                    srcIp = dstIp, dstIp = srcIp,
                    srcPort = 53, dstPort = srcPort,
                    payload = response, ipId = ipIdCounter.getAndIncrement()
                )
                writePacket(output, responsePacket)
                Log.d(TAG, "Forced safe search for $hostname -> $safeSearchTarget")
                return
            }
            // Couldn't resolve the safe-search alias (network hiccup) -- fall through to normal handling
            // rather than leaving the query unanswered.
        }

        if (hostname != null && blocklist.isBlocked(hostname)) {
            val response = buildNxDomainResponse(query)
            val responsePacket = PacketBuilder.buildUdpIpv4Packet(
                srcIp = dstIp, dstIp = srcIp,
                srcPort = 53, dstPort = srcPort,
                payload = response, ipId = ipIdCounter.getAndIncrement()
            )
            writePacket(output, responsePacket)
            Log.d(TAG, "Blocked $hostname")
            return
        }

        // Not blocked (or unparseable -- fail open rather than break DNS entirely).
        val dnsServerAddress = InetAddress.getByAddress(dstIp)
        var socket: DatagramSocket? = null
        try {
            socket = DatagramSocket()
            vpnService.protect(socket)
            socket.soTimeout = 5000
            socket.send(DatagramPacket(query, query.size, dnsServerAddress, 53))

            val respBuf = ByteArray(4096)
            val respPacket = DatagramPacket(respBuf, respBuf.size)
            socket.receive(respPacket)

            val responsePayload = respBuf.copyOf(respPacket.length)
            val responsePacket = PacketBuilder.buildUdpIpv4Packet(
                srcIp = dstIp, dstIp = srcIp,
                srcPort = 53, dstPort = srcPort,
                payload = responsePayload, ipId = ipIdCounter.getAndIncrement()
            )
            writePacket(output, responsePacket)
        } catch (e: Exception) {
            Log.d(TAG, "DNS forward failed for query from port $srcPort: ${e.message}")
        } finally {
            socket?.close()
        }
    }

    /** Best-effort single request/response relay for non-DNS UDP traffic to a captured DNS server IP. */
    private fun handleGenericUdp(
        payload: ByteArray,
        srcIp: ByteArray,
        dstIp: ByteArray,
        srcPort: Int,
        dstPort: Int,
        dstAddress: InetAddress,
        output: FileOutputStream
    ) {
        var socket: DatagramSocket? = null
        try {
            socket = DatagramSocket()
            vpnService.protect(socket)
            socket.soTimeout = 5000
            socket.send(DatagramPacket(payload, payload.size, dstAddress, dstPort))

            val respBuf = ByteArray(4096)
            val respPacket = DatagramPacket(respBuf, respBuf.size)
            socket.receive(respPacket)

            val responsePayload = respBuf.copyOf(respPacket.length)
            val responsePacket = PacketBuilder.buildUdpIpv4Packet(
                srcIp = dstIp, dstIp = srcIp,
                srcPort = dstPort, dstPort = srcPort,
                payload = responsePayload, ipId = ipIdCounter.getAndIncrement()
            )
            writePacket(output, responsePacket)
        } catch (e: Exception) {
            Log.d(TAG, "UDP relay failed for port $dstPort: ${e.message}")
        } finally {
            socket?.close()
        }
    }

    private fun writePacket(output: FileOutputStream, packet: ByteArray) {
        synchronized(writeLock) {
            output.write(packet)
        }
    }

    /** Reads the question-section QNAME from a DNS message (labels start at byte 12). */
    private fun parseQuestionName(message: ByteArray): String? {
        val labels = mutableListOf<String>()
        var pos = 12
        while (pos < message.size) {
            val len = message[pos].toInt() and 0xFF
            if (len == 0) break
            if (len and 0xC0 == 0xC0) break // compression pointer unexpected in a query; bail out
            pos += 1
            if (pos + len > message.size) return null
            labels.add(String(message, pos, len, Charsets.US_ASCII))
            pos += len
        }
        return if (labels.isEmpty()) null else labels.joinToString(".")
    }

    /** Turns a query into an NXDOMAIN response by flipping the header flags in place. */
    private fun buildNxDomainResponse(query: ByteArray): ByteArray {
        val response = query.copyOf()
        response[2] = 0x81.toByte() // QR=1, Opcode=0, AA=0, TC=0, RD=1
        response[3] = 0x83.toByte() // RA=1, Z=0, RCODE=3 (NXDOMAIN)
        return response
    }

    /**
     * If [hostname] is a search engine whose provider publishes an official
     * "forced safe mode" DNS alias, returns that alias hostname. Rewriting
     * the query to answer with this alias (see buildSafeSearchResponse)
     * makes the provider itself enforce safe search server-side --
     * independent of whatever the in-app SafeSearch toggle is set to, which
     * is what actually closes the gap Google/Bing/YouTube search results
     * would otherwise leave open next to the domain blocklist.
     */
    private fun forcedSafeSearchTargetFor(hostname: String): String? {
        val host = hostname.lowercase()
        return when {
            GOOGLE_SEARCH_PATTERN.matches(host) -> "forcesafesearch.google.com"
            host == "bing.com" || host == "www.bing.com" -> "strict.bing.com"
            host == "youtube.com" || host == "www.youtube.com" || host == "m.youtube.com" -> "restrictstrict.youtube.com"
            else -> null
        }
    }

    /**
     * Builds a response for [query] that answers with a CNAME to
     * [aliasHostname] plus that alias's real current A record, resolved via
     * a fresh upstream query to [dnsServerIp] -- rather than hardcoding an
     * IP that could go stale, we always ask the real resolver what the
     * alias currently points to.
     */
    private fun buildSafeSearchResponse(query: ByteArray, aliasHostname: String, dnsServerIp: ByteArray): ByteArray? {
        val qEnd = questionSectionEnd(query) ?: return null
        val qtype = ((query[qEnd - 4].toInt() and 0xFF) shl 8) or (query[qEnd - 3].toInt() and 0xFF)
        if (qtype != 1) return null // only rewrite A queries; let AAAA/other types pass through untouched

        val aliasIp = resolveARecord(aliasHostname, dnsServerIp) ?: return null
        val aliasEncoded = encodeDomainName(aliasHostname)

        val out = java.io.ByteArrayOutputStream()
        out.write(query, 0, 2) // ID, copied from the query
        out.write(byteArrayOf(0x81.toByte(), 0x80.toByte())) // QR=1, RD=1, RA=1
        out.write(byteArrayOf(0x00, 0x01)) // QDCOUNT=1
        out.write(byteArrayOf(0x00, 0x02)) // ANCOUNT=2 (CNAME + A)
        out.write(byteArrayOf(0x00, 0x00)) // NSCOUNT=0
        out.write(byteArrayOf(0x00, 0x00)) // ARCOUNT=0
        out.write(query, 12, qEnd - 12) // question section, copied as-is

        // CNAME record: original queried name -> aliasHostname
        out.write(byteArrayOf(0xC0.toByte(), 0x0C)) // name = pointer to offset 12 (the question's QNAME)
        out.write(byteArrayOf(0x00, 0x05)) // TYPE CNAME
        out.write(byteArrayOf(0x00, 0x01)) // CLASS IN
        out.write(byteArrayOf(0x00, 0x00, 0x00, 0x3C)) // TTL 60s
        out.write(byteArrayOf(((aliasEncoded.size shr 8) and 0xFF).toByte(), (aliasEncoded.size and 0xFF).toByte()))
        out.write(aliasEncoded)

        // A record: aliasHostname -> resolved IP
        out.write(aliasEncoded)
        out.write(byteArrayOf(0x00, 0x01)) // TYPE A
        out.write(byteArrayOf(0x00, 0x01)) // CLASS IN
        out.write(byteArrayOf(0x00, 0x00, 0x00, 0x3C)) // TTL 60s
        out.write(byteArrayOf(0x00, 0x04)) // RDLENGTH 4
        out.write(aliasIp)

        return out.toByteArray()
    }

    /** Byte offset just past the question section (QNAME + QTYPE + QCLASS), starting at byte 12. */
    private fun questionSectionEnd(message: ByteArray): Int? {
        var pos = 12
        while (pos < message.size) {
            val len = message[pos].toInt() and 0xFF
            if (len == 0) {
                pos += 1
                break
            }
            if (len and 0xC0 == 0xC0) {
                pos += 2
                break
            }
            pos += 1 + len
        }
        pos += 4 // QTYPE + QCLASS
        return if (pos <= message.size) pos else null
    }

    /** Skips one DNS "name" field (labels ending in a 0 byte, or a 2-byte compression pointer). */
    private fun skipName(message: ByteArray, startPos: Int): Int {
        var pos = startPos
        while (pos < message.size) {
            val len = message[pos].toInt() and 0xFF
            if (len == 0) {
                pos += 1
                break
            }
            if (len and 0xC0 == 0xC0) {
                pos += 2
                break
            }
            pos += 1 + len
        }
        return pos
    }

    /** Pulls the first A-record IPv4 address out of a raw DNS response message. */
    private fun parseFirstARecordIp(response: ByteArray): ByteArray? {
        if (response.size < 12) return null
        val ancount = ((response[6].toInt() and 0xFF) shl 8) or (response[7].toInt() and 0xFF)
        if (ancount <= 0) return null

        var pos = skipName(response, 12) + 4 // past the (single) question's name + qtype + qclass
        repeat(ancount) {
            if (pos >= response.size) return null
            pos = skipName(response, pos)
            if (pos + 10 > response.size) return null
            val type = ((response[pos].toInt() and 0xFF) shl 8) or (response[pos + 1].toInt() and 0xFF)
            val rdlength = ((response[pos + 8].toInt() and 0xFF) shl 8) or (response[pos + 9].toInt() and 0xFF)
            val rdataStart = pos + 10
            if (type == 1 && rdlength == 4 && rdataStart + 4 <= response.size) {
                return response.copyOfRange(rdataStart, rdataStart + 4)
            }
            pos = rdataStart + rdlength
        }
        return null
    }

    /** Issues a fresh A-record query for [hostname] to [dnsServerIp] and returns the resolved IPv4 bytes. */
    private fun resolveARecord(hostname: String, dnsServerIp: ByteArray): ByteArray? {
        var socket: DatagramSocket? = null
        return try {
            val query = buildSimpleAQuery(hostname)
            socket = DatagramSocket()
            vpnService.protect(socket)
            socket.soTimeout = 5000
            socket.send(DatagramPacket(query, query.size, InetAddress.getByAddress(dnsServerIp), 53))

            val buf = ByteArray(1024)
            val packet = DatagramPacket(buf, buf.size)
            socket.receive(packet)
            parseFirstARecordIp(buf.copyOf(packet.length))
        } catch (e: Exception) {
            null
        } finally {
            socket?.close()
        }
    }

    private fun buildSimpleAQuery(hostname: String): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        val id = (0..0xFFFF).random()
        out.write((id shr 8) and 0xFF)
        out.write(id and 0xFF)
        out.write(byteArrayOf(0x01, 0x00)) // flags: standard query, RD=1
        out.write(byteArrayOf(0x00, 0x01)) // QDCOUNT=1
        out.write(byteArrayOf(0x00, 0x00)) // ANCOUNT
        out.write(byteArrayOf(0x00, 0x00)) // NSCOUNT
        out.write(byteArrayOf(0x00, 0x00)) // ARCOUNT
        out.write(encodeDomainName(hostname))
        out.write(byteArrayOf(0x00, 0x01)) // QTYPE A
        out.write(byteArrayOf(0x00, 0x01)) // QCLASS IN
        return out.toByteArray()
    }

    private fun encodeDomainName(name: String): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        for (label in name.split(".")) {
            if (label.isEmpty()) continue
            out.write(label.length)
            out.write(label.toByteArray(Charsets.US_ASCII))
        }
        out.write(0)
        return out.toByteArray()
    }

    companion object {
        private const val TAG = "DnsSinkholeEngine"
        private val GOOGLE_SEARCH_PATTERN = Regex("^(www\\.)?google(\\.[a-z]{2,3}){1,2}$")
    }
}
