// ── FINISH — hardened with Supabase upsert ───────────────────
document.getElementById('ob2-finish')?.addEventListener('click', async () => {
  const finishBtn  = document.getElementById('ob2-finish');
  const finishText = document.getElementById('ob2-finish-text');
  if (finishBtn)  { finishBtn.disabled = true; }
  if (finishText)   finishText.textContent = 'Building your dashboard…';

  const role          = selectedRole;
  const sport         = selectedSport || coachSport || 'basketball';
  const team          = (document.getElementById('ob-team')?.value ||
                         document.getElementById('ob-coach-team')?.value || '').trim();
  const level         = document.getElementById('ob-level')?.value || 'high_school';
  const position      = document.getElementById('ob-position')?.value || '';
  const age           = parseInt(document.getElementById('ob-age')?.value)    || null;
  const weight        = parseFloat(document.getElementById('ob-weight')?.value) || null;
  const weightUnit    = document.getElementById('ob-weight-unit')?.value || 'lbs';
  const height        = (document.getElementById('ob-height')?.value || '').trim();
  const gradYear      = parseInt(document.getElementById('ob-gradyear')?.value) || null;
  const sleep         = parseFloat(document.getElementById('ob-sleep')?.value)  || 8;
  const injuries      = (document.getElementById('ob-injuries')?.value || '').trim();
  const trainingLevel = document.getElementById('ob-training-level')?.value || 'intermediate';
  const nameVal       = (document.getElementById('ob-name')?.value || '').trim();

  // 1. Update role in localStorage session
  setRole(role);

  const profileData = {
    sport, team, goals, role, level, position, age, weight, weightUnit,
    height, gradYear, sleepHours: sleep, injuries, trainingLevel,
    compPhase: selectedPhase, daysPerWeek,
    primaryGoal: goals[0] || null,
    secondaryGoals: goals.slice(1),
    ...(nameVal ? { name: nameVal } : {}),
  };

  // 2. Mark onboarding complete in localStorage
  markOnboardingDone(profileData);

  // 3. Save to app state
  patchProfile({ ...profileData, name: nameVal || getCurrentUser()?.name });

  // 4. Persist to Supabase (skip for demo users)
  const { data: { user: sbUser } } = await supabase.auth.getUser();
  if (sbUser) {
    const result = await upsertProfile(sbUser.id, {
      ...profileData,
      name:  nameVal || getCurrentUser()?.name,
      email: sbUser.email,
    });

    if (!result.ok) {
      // Show error inline — do NOT navigate on failure
      const errEl = document.getElementById('ob2-error');
      if (errEl) {
        errEl.textContent = `Could not save profile: ${result.error}`;
        errEl.style.display = 'block';
      }
      console.error('[PIQ] upsertProfile error:', result);
      if (finishBtn)  { finishBtn.disabled = false; }
      if (finishText)   finishText.textContent = 'Launch My Dashboard';
      return;
    }
  }

  // 5. Navigate — only on success
  const destination = ROLE_HOME[role] || ROUTES.PLAYER_HOME;
  suppressNextGuard?.();
  setTimeout(() => navigate(destination), 400);
});
