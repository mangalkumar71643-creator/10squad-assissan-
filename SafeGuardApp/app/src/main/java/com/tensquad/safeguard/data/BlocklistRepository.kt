package com.tensquad.safeguard.data

import android.content.Context
import android.util.Log
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

/**
 * Holds the set of blocked domains and answers "is this hostname blocked?"
 * (including subdomains of a blocked domain).
 *
 * Two sources feed the set:
 *  - the bundled asset `adult_domains.txt` (always loaded, works offline)
 *  - an optional downloaded list cached at filesDir/downloaded_blocklist.txt,
 *    refreshed by [updateFromRemote]. Point REMOTE_BLOCKLIST_URL at any
 *    hosts-format or plain-domain-list you trust (e.g. a self-hosted list,
 *    or a maintained public one such as the Blocklist Project's porn list).
 */
class BlocklistRepository(private val context: Context) {

    private val blockedDomains = ConcurrentHashMap.newKeySet<String>()

    @Volatile
    var isLoaded = false
        private set

    val size: Int
        get() = blockedDomains.size

    fun loadIntoMemory() {
        blockedDomains.clear()
        loadBundledAsset()
        loadDownloadedFile()
        isLoaded = true
        Log.i(TAG, "Loaded ${blockedDomains.size} blocked domains")
    }

    /** Exact or subdomain match, e.g. "cdn.pornhub.com" matches "pornhub.com". */
    fun isBlocked(hostname: String): Boolean {
        val host = hostname.trim().trimEnd('.').lowercase()
        if (host.isEmpty()) return false
        if (blockedDomains.contains(host)) return true

        var idx = host.indexOf('.')
        while (idx >= 0) {
            val parent = host.substring(idx + 1)
            if (parent.isEmpty()) break
            if (blockedDomains.contains(parent)) return true
            idx = host.indexOf('.', idx + 1)
        }
        return false
    }

    /** Downloads a fresh list, validates it, and caches it to disk. Runs blocking network I/O — call off the main thread. */
    fun updateFromRemote(url: String = REMOTE_BLOCKLIST_URL): Result<Int> {
        return try {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 10_000
                readTimeout = 15_000
                requestMethod = "GET"
            }
            connection.inputStream.bufferedReader().use { reader ->
                val lines = reader.readLines()
                val parsed = parseDomainLines(lines)
                if (parsed.isEmpty()) {
                    return Result.failure(IllegalStateException("Remote list was empty or unparseable"))
                }
                downloadedFile().writeText(parsed.joinToString("\n"))
                loadIntoMemory()
                Result.success(parsed.size)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Blocklist update failed", e)
            Result.failure(e)
        }
    }

    private fun loadBundledAsset() {
        context.assets.open(ASSET_NAME).bufferedReader().useLines { lines ->
            blockedDomains.addAll(parseDomainLines(lines.toList()))
        }
    }

    private fun loadDownloadedFile() {
        val file = downloadedFile()
        if (file.exists()) {
            blockedDomains.addAll(parseDomainLines(file.readLines()))
        }
    }

    private fun downloadedFile(): File = File(context.filesDir, DOWNLOADED_FILE_NAME)

    /** Accepts plain "domain.com" lines or hosts-file lines ("0.0.0.0 domain.com"), skips comments/blank lines. */
    private fun parseDomainLines(lines: List<String>): Set<String> {
        val result = mutableSetOf<String>()
        for (raw in lines) {
            val line = raw.trim()
            if (line.isEmpty() || line.startsWith("#") || line.startsWith("!")) continue

            val tokens = line.split(Regex("\\s+"))
            val candidate = when {
                tokens.size >= 2 && (tokens[0] == "0.0.0.0" || tokens[0] == "127.0.0.1") -> tokens[1]
                else -> tokens[0]
            }
            val domain = candidate.trim().trimEnd('.').lowercase()
            if (domain.isNotEmpty() && domain.contains('.') && !domain.contains('/')) {
                result.add(domain)
            }
        }
        return result
    }

    companion object {
        private const val TAG = "BlocklistRepository"
        private const val ASSET_NAME = "adult_domains.txt"
        private const val DOWNLOADED_FILE_NAME = "downloaded_blocklist.txt"

        // Replace with a blocklist source you trust and control the update
        // cadence for. Must return plain-text, one domain per line (or hosts
        // format). Left blank by default so no unreviewed third-party host
        // is hit unless a parent explicitly opts in via Settings.
        const val REMOTE_BLOCKLIST_URL = ""
    }
}
