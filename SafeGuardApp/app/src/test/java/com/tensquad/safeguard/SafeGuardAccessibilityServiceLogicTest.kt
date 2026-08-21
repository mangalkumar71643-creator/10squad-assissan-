package com.tensquad.safeguard

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Runs on the plain JVM (no device/emulator needed) against text
 * transcribed directly from a real screenshot of the "Device admin app"
 * detail screen for SafeGuard 2, to prove the bounce-back decision logic
 * fires on the real screen and stays quiet everywhere else.
 */
class SafeGuardAccessibilityServiceLogicTest {

    // Exact text from the user's screenshot of Settings > Device admin app > SafeGuard 2.
    private val realDeactivateScreenText = """
        Device admin app
        SafeGuard 2
        This admin app is active and allows the SafeGuard 2 app
        to perform the following operations:
        Set password rules
        Monitor screen unlock attempts
        Deactivate
        Cancel
    """.trimIndent()

    @Test
    fun `bounces back on the real deactivate screen text`() {
        assertTrue(
            SafeGuardAccessibilityService.shouldBounceBack(realDeactivateScreenText, "SafeGuard 2")
        )
    }

    @Test
    fun `does not bounce on the app's own enable-admin explanation screen`() {
        // Same explanation string is shown during the app's own onboarding
        // "Activate this device admin app?" flow -- no "Deactivate" text there.
        val enableScreenText = """
            Activate this device admin app?
            SafeGuard 2
            SafeGuard 2 uses this permission so protection settings cannot be
            turned off without the parent PIN.
            Cancel
            Activate this device admin app
        """.trimIndent()
        assertFalse(
            SafeGuardAccessibilityService.shouldBounceBack(enableScreenText, "SafeGuard 2")
        )
    }

    @Test
    fun `does not bounce on an unrelated app's device admin screen`() {
        val otherAppScreenText = """
            Device admin app
            Find Hub
            This admin app is active and allows the Find Hub app
            to perform the following operations:
            Erase all data
            Deactivate
            Cancel
        """.trimIndent()
        assertFalse(
            SafeGuardAccessibilityService.shouldBounceBack(otherAppScreenText, "SafeGuard 2")
        )
    }

    @Test
    fun `does not bounce on an unrelated settings screen`() {
        val unrelatedScreenText = """
            Wi-Fi
            Network preferences
            Private DNS
        """.trimIndent()
        assertFalse(
            SafeGuardAccessibilityService.shouldBounceBack(unrelatedScreenText, "SafeGuard 2")
        )
    }
}
