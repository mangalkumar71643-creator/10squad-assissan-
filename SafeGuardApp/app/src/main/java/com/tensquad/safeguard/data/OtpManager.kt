package com.tensquad.safeguard.data

import android.telephony.SmsManager
import kotlin.random.Random

/**
 * Generates one OTP per parent, texts each to their registered number, and
 * verifies both were entered correctly within a short validity window.
 * Deliberately in-memory only (not persisted) -- these codes are only ever
 * meant to be valid for one approval attempt in one sitting.
 */
class OtpManager {

    private var otp1: String? = null
    private var otp2: String? = null
    private var expiresAt: Long = 0L

    fun sendOtps(phone1: String, phone2: String, appName: String) {
        val code1 = randomOtp()
        val code2 = randomOtp()
        otp1 = code1
        otp2 = code2
        expiresAt = System.currentTimeMillis() + VALIDITY_MS

        val sms = SmsManager.getDefault()
        sms.sendTextMessage(phone1, null, "$appName parent approval code: $code1", null, null)
        sms.sendTextMessage(phone2, null, "$appName parent approval code: $code2", null, null)
    }

    fun verify(input1: String, input2: String): VerifyResult {
        if (otp1 == null || otp2 == null) return VerifyResult.WRONG
        if (System.currentTimeMillis() > expiresAt) return VerifyResult.EXPIRED
        return if (input1.trim() == otp1 && input2.trim() == otp2) VerifyResult.SUCCESS else VerifyResult.WRONG
    }

    private fun randomOtp(): String = (100000 + Random.nextInt(900000)).toString()

    enum class VerifyResult { SUCCESS, WRONG, EXPIRED }

    companion object {
        private const val VALIDITY_MS = 5 * 60 * 1000L
    }
}
