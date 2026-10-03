import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAdmin } from '../../../../lib/authorization';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'All States';
  const district = searchParams.get('district');

  const target = district ? `${district}, ${state}` : state;

  const insights = [
    `No causal impact estimate is available for ${target}. Review objection counts and sample sizes before making an intervention decision.`,
    `Use only reviewed outcome records and locally reviewed language content when preparing counselling material for ${target}.`,
    `If the sample is large enough, compare objection and escalation rates over time before attributing any change to the platform.`
  ];

  return NextResponse.json({ insights, weak_signal: true });
}
