export async function getCallMedia(_facing?: 'user' | 'environment'): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available in this browser. Use localhost or HTTPS.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (first) {
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
    const videos = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    const audios = devices.filter((d) => d.kind === 'audioinput' && d.deviceId);
    const videoOpts: Array<boolean | { deviceId: { exact: string } }> = videos.length
      ? videos.map((d) => ({ deviceId: { exact: d.deviceId } }))
      : [true];
    const audioOpts: Array<boolean | { deviceId: { exact: string } }> = audios.length
      ? audios.map((d) => ({ deviceId: { exact: d.deviceId } }))
      : [true];

    for (const video of videoOpts) {
      for (const audio of audioOpts) {
        try {
          return await navigator.mediaDevices.getUserMedia({ video, audio });
        } catch {
          /* try next pair */
        }
      }
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      /* ignore */
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch {
      /* ignore */
    }
    throw first;
  }
}

export function mediaErrorMessage(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
  const message = err instanceof Error ? err.message : String(err);
  const brave = typeof navigator !== 'undefined' && 'brave' in navigator;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was blocked. Click the camera or lock icon in the address bar, allow Camera and Microphone, then try again.';
  }
  if (name === 'NotFoundError' || /requested device not found/i.test(message)) {
    return brave
      ? 'Brave did not expose a camera. Click the lion/Shields icon, allow Camera and Microphone for this site, then press Allow camera.'
      : 'No camera was exposed to this site. Click the camera or lock icon in the address bar, allow Camera and Microphone, then try again.';
  }
  if (name === 'NotReadableError') {
    return 'Camera is already in use by another app. Close it and try again.';
  }
  if (name === 'SecurityError') {
    return 'Camera access is blocked on this page. Use http://localhost or HTTPS.';
  }
  return message || 'Could not start camera';
}
