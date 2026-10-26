import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getCustomerDetails } from '@/lib/customerDetails';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get('userId') ?? '';
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
  }

  await ensureSchema();
  const details = await getCustomerDetails(userId);
  if (!details) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }
  return NextResponse.json({ details });
}
