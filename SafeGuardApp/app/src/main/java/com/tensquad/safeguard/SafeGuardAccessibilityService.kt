package com.tensquad.safeguard

import android.accessibilityservice.AccessibilityService
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import com.tensquad.safeguard.receiver.SafeGuardDeviceAdminReceiver

/**
 * SafeGuard accessibility entry point. It does not store or transmit screen
 * content anywhere -- node text is only read in-memory, for one screen at a
 * time, to decide whether to bounce the user out of it.
 *
 * Its one job: watch for the "Device admin app" detail screen -- the one
 * that shows "This admin app is active and allows the SafeGuard 2 app to
 * perform the following operations..." with Deactivate/Cancel buttons --
 * and immediately back out of it before Deactivate can be tapped, but only
 * while our admin is still active. Matching on the app's own name plus the
 * literal "Deactivate" button text (both confirmed against a real
 * screenshot of this screen) keeps it specific to this app's own admin
 * screen; gating on isAdminActive() additionally keeps the app's own
 * *enable* flow (MainActivity's ACTION_ADD_DEVICE_ADMIN request, where the
 * admin isn't active yet) from ever being touched.
 *
 * It's still just a screen-level bounce, not OS-level enforcement, and it
 * can't act faster than a UI that would commit the toggle with zero
 * intermediate screen -- Device Owner mode (see README) is the only way to
 * remove the option entirely.
 */
class SafeGuardAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val type = event.eventType
        if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        ) return
        val eventPkg = event.packageName?.toString() ?: return
        if (eventPkg == packageName) return

        val dpm = getSystemService(DevicePolicyManager::class.java) ?: return
        val admin = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
        if (!dpm.isAdminActive(admin)) return

        // DIAGNOSTICS: temporary, loud on purpose -- pinpointing why the
        // bounce isn't firing on a device we can't test directly. Shows one
        // short toast per relevant screen change so it's visible on-device
        // without needing adb/logcat. Remove once root-caused.
        val root = rootInActiveWindow
        if (root == null) {
            Log.d(TAG, "pkg=$eventPkg -- rootInActiveWindow is null, cannot read screen content")
            Toast.makeText(this, "A11y saw $eventPkg but root=null", Toast.LENGTH_SHORT).show()
            return
        }

        val screenText = try {
            collectText(root)
        } finally {
            root.recycle()
        }
        val matched = shouldBounceBack(screenText, getString(R.string.app_name))
        Log.d(TAG, "pkg=$eventPkg matched=$matched textLen=${screenText.length} text=\"${screenText.take(200)}\"")
        Toast.makeText(this, "A11y: $eventPkg matched=$matched len=${screenText.length}", Toast.LENGTH_SHORT).show()

        if (matched) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            Toast.makeText(this, getString(R.string.admin_deactivate_blocked_toast), Toast.LENGTH_LONG).show()
        }
    }

    private fun collectText(node: AccessibilityNodeInfo, depth: Int = 0): String {
        if (depth > 40) return ""
        val builder = StringBuilder()
        node.text?.let { builder.append(it).append(' ') }
        node.contentDescription?.let { builder.append(it).append(' ') }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            builder.append(collectText(child, depth + 1))
            child.recycle()
        }
        return builder.toString()
    }

    override fun onInterrupt() = Unit

    companion object {
        private const val TAG = "SafeGuardA11y"

        /**
         * Pure decision function, kept separate from any Android framework
         * class so it can run as a plain JVM unit test (see
         * SafeGuardAccessibilityServiceLogicTest) without a device or
         * emulator. True when [screenText] is this app's own device-admin
         * detail/deactivation screen.
         */
        fun shouldBounceBack(screenText: String, appName: String): Boolean {
            val mentionsThisApp = screenText.contains(appName, ignoreCase = true)
            val hasDeactivateAction = screenText.contains("deactivate", ignoreCase = true)
            return mentionsThisApp && hasDeactivateAction
        }
    }
}
