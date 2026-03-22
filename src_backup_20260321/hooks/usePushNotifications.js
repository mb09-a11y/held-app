import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert VAPID key from base64 to Uint8Array (required by browser push API)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// Detect device type for labeling the subscription
function getDeviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Browser";
}

export function usePushNotifications(userId) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check support and existing subscription on mount
  useEffect(() => {
    if (!userId) return;

    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    setPermission(supported ? Notification.permission : "denied");

    if (supported && Notification.permission === "granted") {
      checkExistingSubscription();
    }
  }, [userId]);

  async function checkExistingSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Verify it's stored in Supabase
        const endpoint = sub.endpoint;
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .filter("subscription->endpoint", "eq", endpoint)
          .maybeSingle();
        setIsSubscribed(!!data);
      }
    } catch (e) {
      console.warn("Error checking push subscription:", e);
    }
  }

  async function subscribe() {
    if (!isSupported || !userId) return;
    setLoading(true);
    setError(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError("Notification permission denied. You can enable it in your browser settings.");
        setLoading(false);
        return;
      }

      // Register service worker if not already
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store in Supabase
      const subJson = sub.toJSON();
      const { error: dbError } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        subscription: subJson,
        device_label: getDeviceLabel(),
      }, { onConflict: "user_id,endpoint" });

      if (dbError) throw dbError;

      setIsSubscribed(true);
    } catch (e) {
      console.error("Push subscribe error:", e);
      setError(e.message || "Failed to enable notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!isSupported || !userId) return;
    setLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Remove from Supabase
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .filter("subscription->endpoint", "eq", endpoint);
      }

      setIsSubscribed(false);
    } catch (e) {
      console.error("Push unsubscribe error:", e);
      setError(e.message || "Failed to disable notifications.");
    } finally {
      setLoading(false);
    }
  }

  return { isSupported, isSubscribed, permission, loading, error, subscribe, unsubscribe };
}
