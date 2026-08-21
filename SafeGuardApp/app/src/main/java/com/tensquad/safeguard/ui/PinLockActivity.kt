package com.tensquad.safeguard.ui

import android.app.Activity
import android.os.Bundle
import android.view.View
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.databinding.ActivityPinLockBinding

/**
 * Gatekeeper screen: must be passed (correct PIN entered) before the caller
 * is allowed to turn protection off. Callers start this with
 * startActivityForResult and check for RESULT_OK.
 */
class PinLockActivity : Activity() {

    private lateinit var binding: ActivityPinLockBinding
    private lateinit var prefs: PrefsManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPinLockBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = PrefsManager(applicationContext)

        binding.unlockButton.setOnClickListener { onUnlockClicked() }
    }

    private fun onUnlockClicked() {
        val pin = binding.pinInput.text.toString()
        if (prefs.verifyPin(pin)) {
            setResult(RESULT_OK)
            finish()
        } else {
            binding.errorText.visibility = View.VISIBLE
        }
    }
}
