/*
* Tuulikartta.info notification banner
* Copyright (C) 2017 Ville Oravilkka
*
* Fetches the single most relevant active notification/alert from
* php/notifications.php and shows it as a banner at the bottom of the
* page.
*
* Every message can be closed with the close button.
*
* For a plain notification, closing it (via the close button, or by
* clicking the message/link itself) snoozes further notifications for 4
* days, remembered in localStorage - it won't come back, even on reload,
* until the snooze expires.
*
* Alerts are never snoozed this way: closing an alert only hides it for
* the current page view - it is not remembered, so it comes back on the
* next reload for as long as it's still active.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  var RECHECK_INTERVAL_MS = 15 * 60000

  var NOTIFICATIONS_SNOOZED_UNTIL_KEY = 'notificationsSnoozedUntil'
  var NOTIFICATIONS_SNOOZE_DAYS = 4

  function snoozeNotifications() {
    try {
      var until = new Date(Date.now() + NOTIFICATIONS_SNOOZE_DAYS * 24 * 60 * 60000)
      localStorage.setItem(NOTIFICATIONS_SNOOZED_UNTIL_KEY, until.toISOString())
    } catch (e) {
      // localStorage unavailable (private browsing, full quota, etc.) -
      // the snooze just won't be remembered across reloads
    }
  }

  function isNotificationsSnoozed() {
    try {
      var raw = localStorage.getItem(NOTIFICATIONS_SNOOZED_UNTIL_KEY)
      if (!raw) return false
      var until = new Date(raw)
      return !isNaN(until.getTime()) && new Date() < until
    } catch (e) {
      return false
    }
  }

  function renderNotification(notification) {
    var banner = document.getElementById('notification-banner')
    var icon = document.getElementById('notification-banner-icon')
    var text = document.getElementById('notification-banner-text')
    var link = document.getElementById('notification-banner-link')
    var close = document.getElementById('notification-banner-close')

    if (!banner || !icon || !text || !link || !close) return

    var isAlert = notification.type === 'alert'
    $(banner).toggleClass('alert', isAlert)
    icon.textContent = isAlert ? '!' : 'i'

    // notification text comes from the site's own database, not user
    // input, so it's trusted the same way translations.js content is
    // (e.g. dataInfoBody3 already embeds a raw <a> tag)
    text.innerHTML = selectedLanguage === 'en' ? notification.textEn : notification.textFi

    if (notification.link) {
      link.href = notification.link
      link.textContent = translations[selectedLanguage]['notificationReadMore']
      link.hidden = false
    } else {
      link.hidden = true
    }

    var hideOnly = function () {
      banner.hidden = true
    }
    var snoozeAndHide = function () {
      snoozeNotifications()
      banner.hidden = true
    }

    // for a plain notification, engaging with it at all (clicking the
    // message/link, or closing it) snoozes further notifications for a
    // few days. alerts are never snoozed - closing one only hides it for
    // this page view, it reappears on reload as long as it's still active
    var onEngage = isAlert ? null : snoozeAndHide
    text.onclick = onEngage
    link.onclick = onEngage
    $(text).toggleClass('notification-banner-text-clickable', !isAlert)

    close.onclick = isAlert ? hideOnly : snoozeAndHide

    banner.hidden = false
  }

  Tuulikartta.checkNotifications = function () {
    $.ajax({
      dataType: 'json',
      url: 'php/notifications.php',
      error: function (jqXHR, textStatus) {
        console.warn('Tuulikartta: could not load notifications (' + textStatus + ')')
      },
      success: function (notification) {
        var banner = document.getElementById('notification-banner')

        // alerts are always shown regardless of any snooze - only plain
        // notifications can be snoozed
        if (notification && notification.type === 'notification' && isNotificationsSnoozed()) {
          notification = null
        }

        if (notification) {
          renderNotification(notification)
        } else if (banner) {
          banner.hidden = true
        }
      }
    })
  }

  setInterval(Tuulikartta.checkNotifications, RECHECK_INTERVAL_MS)

}(saa.Tuulikartta = saa.Tuulikartta || {}))
