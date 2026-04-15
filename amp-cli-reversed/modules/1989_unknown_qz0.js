function qz0(T) {
  return qXR({
    playNotificationSound: async R => {
      if (T.useNotificationsForService) {
        if (R === "idle" && T.isTUIVoiceNotifEnabled()) HXR();else UXR(R);
        let a = dX(),
          e = T5T();
        if ((!a || e || Lu0()) && T.config.settings["notifications.system.enabled"] !== !1) {
          if (R === "idle") process.stdout.write(FP("\x1B]777;notify;Amp;Agent is ready\x1B\\"));else if (R === "requires-user-input") process.stdout.write(FP("\x1B]777;notify;Amp;Waiting for approval\x1B\\"));
        }
      }
    },
    windowFocused: () => Promise.resolve(dX()),
    threadService: T.threadService,
    configService: T.configService,
    threadViewStates$: T.threadViewStates$
  });
}