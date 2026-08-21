package com.tensquad.safeguard.vpn

/** Builds raw IPv4 + UDP packets to write back into the TUN interface. */
object PacketBuilder {

    fun buildUdpIpv4Packet(
        srcIp: ByteArray,
        dstIp: ByteArray,
        srcPort: Int,
        dstPort: Int,
        payload: ByteArray,
        ipId: Int
    ): ByteArray {
        val udpLength = 8 + payload.size
        val totalLength = 20 + udpLength
        val packet = ByteArray(totalLength)

        // --- IPv4 header (20 bytes, no options) ---
        packet[0] = 0x45 // version 4, IHL 5
        packet[1] = 0 // DSCP/ECN
        packet[2] = ((totalLength shr 8) and 0xFF).toByte()
        packet[3] = (totalLength and 0xFF).toByte()
        packet[4] = ((ipId shr 8) and 0xFF).toByte()
        packet[5] = (ipId and 0xFF).toByte()
        packet[6] = 0x40.toByte() // flags: Don't Fragment
        packet[7] = 0
        packet[8] = 64 // TTL
        packet[9] = 17 // protocol UDP
        packet[10] = 0 // checksum placeholder
        packet[11] = 0
        System.arraycopy(srcIp, 0, packet, 12, 4)
        System.arraycopy(dstIp, 0, packet, 16, 4)

        val ipChecksum = checksum(packet, 0, 20)
        packet[10] = ((ipChecksum shr 8) and 0xFF).toByte()
        packet[11] = (ipChecksum and 0xFF).toByte()

        // --- UDP header. Checksum left as 0, which RFC 768 defines as "no
        // checksum" for IPv4 UDP -- avoids needing the IPv4 pseudo-header sum. ---
        val udpOffset = 20
        packet[udpOffset] = ((srcPort shr 8) and 0xFF).toByte()
        packet[udpOffset + 1] = (srcPort and 0xFF).toByte()
        packet[udpOffset + 2] = ((dstPort shr 8) and 0xFF).toByte()
        packet[udpOffset + 3] = (dstPort and 0xFF).toByte()
        packet[udpOffset + 4] = ((udpLength shr 8) and 0xFF).toByte()
        packet[udpOffset + 5] = (udpLength and 0xFF).toByte()
        packet[udpOffset + 6] = 0
        packet[udpOffset + 7] = 0

        System.arraycopy(payload, 0, packet, udpOffset + 8, payload.size)

        return packet
    }

    /** Standard 16-bit one's complement checksum (used for the IPv4 header). */
    private fun checksum(data: ByteArray, offset: Int, length: Int): Int {
        var sum = 0L
        var i = offset
        val end = offset + length
        while (i < end - 1) {
            val word = ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
            sum += word
            i += 2
        }
        if (i < end) {
            sum += (data[i].toInt() and 0xFF) shl 8
        }
        while (sum shr 16 != 0L) {
            sum = (sum and 0xFFFF) + (sum shr 16)
        }
        return sum.inv().toInt() and 0xFFFF
    }
}
