package com.tensquad.safeguard.vpn

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.tensquad.safeguard.R
import com.tensquad.safeguard.data.BlocklistRepository
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.ui.MainActivity
import java.net.InetAddress
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The VPN routes ONLY the device's DNS server IPs (plus a couple of public
 * fallbacks) into the tunnel -- not all traffic. That keeps every other app
 * connection flowing over the network exactly as normal, while every DNS
 * lookup gets a chance to be checked against the blocklist. See
 * DnsSinkholeEngine for the packet handling and README for the trade-offs.
 */
class SafeGuardVpnService : VpnService() {

    private var tunInterface: ParcelFileDescriptor? = null
    private var engineThread: Thread? = null
    private val running = AtomicBoolean(false)
    private lateinit var blocklist: BlocklistRepository

    override fun onCreate() {
        super.onCreate()
        blocklist = BlocklistRepository(applicationContext)
        blocklist.loadIntoMemory()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopVpn()
            return START_NOT_STICKY
        }
        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        if (running.get()) return

        val dnsServers = discoverDnsServers()
        val builder = Builder()
            .setSession(getString(R.string.app_name))
            .addAddress(TUN_ADDRESS, 32)
            .setMtu(TUN_MTU)
            .setBlocking(true)

        val allDnsTargets = (dnsServers.map { it.hostAddress } + FALLBACK_DNS).distinct()
        for (dns in allDnsTargets) {
            try {
                builder.addRoute(dns, 32)
                builder.addDnsServer(dns)
            } catch (e: IllegalArgumentException) {
                Log.w(TAG, "Skipping invalid DNS route $dns", e)
            }
        }

        try {
            builder.addDisallowedApplication(packageName)
        } catch (e: Exception) {
            Log.w(TAG, "Could not exclude self from VPN", e)
        }

        tunInterface = try {
            builder.establish()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VPN", e)
            null
        }

        val fd = tunInterface ?: return
        running.set(true)
        startForeground(NOTIFICATION_ID, buildNotification())

        engineThread = Thread({
            DnsSinkholeEngine(this, fd, blocklist, running).run()
        }, "SafeGuardEngine").apply { start() }

        PrefsManager(applicationContext).protectionEnabled = true
    }

    private fun stopVpn() {
        running.set(false)
        engineThread?.interrupt()
        engineThread = null
        try {
            tunInterface?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing tun interface", e)
        }
        tunInterface = null
        PrefsManager(applicationContext).protectionEnabled = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }

    private fun discoverDnsServers(): List<InetAddress> {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = cm.activeNetwork ?: return emptyList()
            val props = cm.getLinkProperties(network) ?: return emptyList()
            props.dnsServers.filter { it.hostAddress?.contains(':') == false } // IPv4 only for this MVP
        } catch (e: Exception) {
            Log.w(TAG, "Could not read active network DNS servers", e)
            emptyList()
        }
    }

    private fun buildNotification(): android.app.Notification {
        val manager = NotificationManagerCompat.from(this)
        val channel = NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
            .setName(getString(R.string.app_name))
            .build()
        manager.createNotificationChannel(channel)

        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.status_protected))
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "SafeGuardVpnService"
        const val ACTION_STOP = "com.tensquad.safeguard.STOP_VPN"
        private const val CHANNEL_ID = "safeguard_vpn"
        private const val NOTIFICATION_ID = 42
        private const val TUN_ADDRESS = "10.0.0.2"
        private const val TUN_MTU = 32000
        private val FALLBACK_DNS = listOf("8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1")
    }
}
