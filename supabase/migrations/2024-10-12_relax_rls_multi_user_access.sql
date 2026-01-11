-- Allow authenticated users to access shared school data across the app.

drop policy if exists "classes_owner_access" on public.classes;
create policy "classes_authenticated_access" on public.classes
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "students_owner_access" on public.students;
create policy "students_authenticated_access" on public.students
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "grades_owner_access" on public.grades;
create policy "grades_authenticated_access" on public.grades
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "attendance_owner_access" on public.attendance;
create policy "attendance_authenticated_access" on public.attendance
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "incidents_owner_access" on public.incidents;
create policy "incidents_authenticated_access" on public.incidents
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "follow_ups_owner_access" on public.follow_ups;
create policy "follow_ups_authenticated_access" on public.follow_ups
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "comments_owner_access" on public.comments;
create policy "comments_authenticated_access" on public.comments
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "professional_subject_templates_owner_access" on public.professional_subject_templates;
create policy "professional_subject_templates_authenticated_access" on public.professional_subject_templates
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "professional_subjects_owner_access" on public.professional_subjects;
create policy "professional_subjects_authenticated_access" on public.professional_subjects
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
