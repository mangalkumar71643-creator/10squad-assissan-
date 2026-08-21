package com.tensquad.safeguard.ui

import android.app.Activity
import android.os.Bundle
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.databinding.ActivitySetPinBinding

/** First-run (and "change PIN") screen: parent sets the PIN required to disable protection. */
class SetPinActivity : Activity() {

    private lateinit var binding: ActivitySetPinBinding
    private lateinit var prefs: PrefsManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySetPinBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = PrefsManager(applicationContext)

        binding.savePinButton.setOnClickListener { onSaveClicked() }
    }

    private fun onSaveClicked() {
        val pin = binding.pinInput.text.toString()
        val confirm = binding.pinConfirmInput.text.toString()

        if (pin.length < 4 || pin.length > 6 || !pin.all { it.isDigit() }) {
            showError(getString(com.tensquad.safeguard.R.string.error_pin_length))
            return
        }
        if (pin != confirm) {
            showError(getString(com.tensquad.safeguard.R.string.error_pin_mismatch))
            return
        }

        prefs.setPin(pin)
        setResult(RESULT_OK)
        finish()
    }

    private fun showError(message: String) {
        binding.errorText.text = message
        binding.errorText.visibility = android.view.View.VISIBLE
    }
}
