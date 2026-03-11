export function signInLocal(state, email, role){
  state.session.loggedIn = true;
  state.session.user = email;
  state.session.role = role;
}
