const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfillProgress() {
  console.log('🔄 Running One-Time Idempotent Progress Backfill...\n');

  // Fetch all monthly tasks
  const { data: tasks, error: tErr } = await supabase.from('monthly_tasks').select('*');
  if (tErr) {
    console.error('Failed to fetch monthly tasks:', tErr);
    return;
  }

  // Fetch all eod_task_updates
  const { data: updates, error: uErr } = await supabase.from('eod_task_updates').select('*');
  if (uErr) {
    console.error('Failed to fetch eod_task_updates:', uErr);
    return;
  }

  // Group unique work dates by monthly_task_id
  const taskDatesMap = new Map();
  for (const u of updates || []) {
    if (!taskDatesMap.has(u.monthly_task_id)) {
      taskDatesMap.set(u.monthly_task_id, new Set());
    }
    taskDatesMap.get(u.monthly_task_id).add(u.work_date);
  }

  for (const task of tasks || []) {
    const uniqueDates = taskDatesMap.get(task.id) || new Set();
    const startDateStr = task.assigned_date || task.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    const start = new Date(startDateStr);
    const end = new Date(task.due_date);
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const dailyIncrement = 95 / totalDays;

    let targetProgress = 0;
    if (task.status === 'completed') {
      targetProgress = 100;
    } else {
      targetProgress = Math.min(95, Math.round(uniqueDates.size * dailyIncrement));
    }

    console.log(`Task "${task.title}":`);
    console.log(`  - Pacing Window: ${startDateStr} to ${task.due_date} (${totalDays} days, ${dailyIncrement.toFixed(2)}%/day)`);
    console.log(`  - Logged Work Sessions: ${uniqueDates.size} unique day(s)`);
    console.log(`  - Old Progress: ${task.progress}% -> New Progress: ${targetProgress}%\n`);

    await supabase
      .from('monthly_tasks')
      .update({
        progress: targetProgress,
        status: task.status === 'not_started' && uniqueDates.size > 0 ? 'in_progress' : task.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);
  }

  console.log('✅ Backfill complete!');
}

backfillProgress();
