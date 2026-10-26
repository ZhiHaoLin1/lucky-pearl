import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DEVICE_COOKIE, isValidDeviceId, newDeviceId, setDeviceCookie } from '@/lib/accountSignals';

// Keeps one stable id per browser. The id lives in a cookie, and the page keeps a copy in
// localStorage too: if someone clears cookies but not site storage, the copy is sent back
// here and the cookie is restored, so the same device keeps the same id.
export async function POST(request: Request) {
  const fromCookie = cookies().get(DEVICE_COOKIE)?.value;
  let deviceId: string;

  if (isValidDeviceId(fromCookie)) {
    deviceId = fromCookie;
  } else {
    let fromStorage: unknown = null;
    try {
      fromStorage = (await request.json())?.id;
    } catch {
      // no body
    }
    deviceId = typeof fromStorage === 'string' && isValidDeviceId(fromStorage) ? fromStorage : newDeviceId();
  }

  const response = NextResponse.json({ id: deviceId });
  setDeviceCookie(response, deviceId);
  return response;
}
