package com.tensquad.safeguard.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.vpn.SafeGuardVpnService

/**
 * Restarts protection after a reboot, but only if the user had it on and the
 * VPN permission is still granted (VpnService.prepare returns null when it
 * is). If consent was revoked, we leave it off rather than prompting from a
 * background receiver -- the parent can just reopen the app.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = PrefsManager(context)
        if (!prefs.protectionEnabled) return
        if (VpnService.prepare(context) != null) return // consent no longer valid

        context.startForegroundService(Intent(context, SafeGuardVpnService::class.java))
    }
}
