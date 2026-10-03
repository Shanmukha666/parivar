import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '../../../../lib/authorization';

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;

  try {
    const { data: escalations, error } = await supabase
      .from('escalations')
      .select(`
        id,
        session_id,
        reason,
        summary,
        status,
        counsellor_id,
        priority,
        concern_category,
        accepted_at,
        contacted_at,
        created_at,
        sessions (
          district,
          state,
          user_role,
          learner_class,
          income_bracket,
          trades (
            name_en
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (escalations || []).map((item: any) => ({
      id: item.id,
      session_id: item.session_id,
      reason: item.reason,
      summary: item.summary,
      status: item.status,
      created_at: item.created_at,
      family_profile: {
        district: item.sessions?.district || 'Unknown',
        state: item.sessions?.state || 'Unknown',
        role: item.sessions?.user_role || 'Family',
        learner_class: item.sessions?.learner_class || 'Class 10',
        income_bracket: item.sessions?.income_bracket || '₹1 - 3 Lakhs',
        trade_name: item.sessions?.trades?.name_en || 'Vocational Trade',
      }
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
