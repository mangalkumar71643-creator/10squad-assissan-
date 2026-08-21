package com.tensquad.safeguard.receiver

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Registering as a device admin adds friction to uninstalling the app: on
 * stock Android, an app cannot be uninstalled while it holds an active
 * device admin, so a child would first have to find Settings > Security >
 * Device admin apps and deactivate it there. It is not real MDM-grade
 * enforcement (a technically savvy user can still get through Settings),
 * but combined with the PIN gate on the in-app toggle it meaningfully
 * raises the bar. See README for the honest limitations of this approach.
 *
 * onDisableRequested() is the only hook Android gives a plain (non-Device
 * Owner) admin to react to a deactivation attempt: the returned text is
 * shown in the OS's own "Deactivate this device admin app?" confirmation
 * dialog, right above its existing Cancel/Deactivate buttons. It cannot
 * block or intercept that dialog -- Android deliberately never lets an app
 * prevent its own admin removal outside Device Owner mode, otherwise a
 * malicious app could make itself unremovable. For deactivation to be
 * genuinely blocked (not just warned about), see the Device Owner setup in
 * README.md -- Device Owner apps don't get a Deactivate option here at all.
 */
class SafeGuardDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Turning off Device Admin removes SafeGuard's protection against being uninstalled. " +
            "Ask your parent for the PIN before doing this."
    }
}
