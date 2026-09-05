-- End-to-end learning readiness: MCQ content and student read policies.
-- Safe to run more than once after all earlier migrations.

update public.questions set
  options = '["Restart all pods immediately","Trace Service selectors, EndpointSlices, ports, and readiness","Increase replicas only","Delete and recreate the Service"]'::jsonb,
  correct_option = 1
where source_key = 'q-001';

update public.questions set
  options = '["It creates multiple running containers","It separates build tools from a minimal runtime image","It automatically scales containers","It replaces the registry"]'::jsonb,
  correct_option = 1
where source_key = 'q-002';

update public.questions set
  options = '["Commit state to Git","Use encrypted remote state with locking and controlled applies","Email state files to the team","Disable state refresh"]'::jsonb,
  correct_option = 1
where source_key = 'q-003';

update public.questions set
  options = '["CPU saturation only","Tasks blocked in disk or network I/O","A DNS record expired","The server has too much free memory"]'::jsonb,
  correct_option = 1
where source_key = 'q-004';

update public.questions set
  options = '["For safely undoing a shared commit","For deleting a remote repository","For creating tags","For resolving every merge conflict"]'::jsonb,
  correct_option = 0
where source_key = 'q-005';

update public.questions set
  options = '["Restart Jenkins first","Compare stage, queue, cache, dependency, and agent-resource timings","Increase every timeout","Disable tests"]'::jsonb,
  correct_option = 1
where source_key = 'q-006';

update public.questions set
  options = '["ALB is Layer 7; NLB is primarily Layer 4","Both are identical","ALB supports UDP only","NLB cannot handle TLS"]'::jsonb,
  correct_option = 0
where source_key = 'q-007';

update public.questions set
  options = '["It fires for every metric spike","It represents service impact and includes ownership, context, and a runbook","It has no severity","It pages every engineer"]'::jsonb,
  correct_option = 1
where source_key = 'q-008';

update public.questions set
  options = '["DNS → load balancer → ingress/service → ready pod endpoint","DNS → pod filesystem","Browser → etcd directly","DNS → container image registry"]'::jsonb,
  correct_option = 0
where source_key = 'q-009';

update public.questions set
  options = '["Ignore exit codes","Use strict mode, validation, quoting, traps, and idempotency","Store secrets in the script","Always run destructive commands automatically"]'::jsonb,
  correct_option = 1
where source_key = 'q-010';

drop policy if exists "learning_paths_read_published" on public.learning_paths;
create policy "learning_paths_read_published"
on public.learning_paths for select to authenticated
using (is_published = true or public.is_admin());

drop policy if exists "learning_path_steps_read" on public.learning_path_steps;
create policy "learning_path_steps_read"
on public.learning_path_steps for select to authenticated
using (
  exists (
    select 1 from public.learning_paths lp
    where lp.id = learning_path_id and (lp.is_published = true or public.is_admin())
  )
);

drop policy if exists "topics_read_authenticated" on public.topics;
create policy "topics_read_authenticated"
on public.topics for select to authenticated
using (true);
