// Form rules, in the same words as the server's (8 to 72 characters, not your email, names up to 40)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validate = {
  email: (v = '') => (!v.trim() ? 'Enter your email' : EMAIL.test(v.trim()) ? null : 'Enter a valid email, like name@example.com'),
  password: (v = '', { email } = {}) =>
    v.length < 8 ? 'Use at least 8 characters'
      : v.length > 72 ? 'Use 72 characters or fewer'
        : email && v.trim().toLowerCase() === email.trim().toLowerCase() ? "Don't use your email as your password"
          : null,
  name: (v = '') => (!v.trim() ? 'Enter your name' : v.trim().length > 40 ? 'Use 40 characters or fewer' : null),
  signupCode: (v = '') => (v.trim() ? null : 'Enter the signup code from your family admin'),
  confirm: (a, b) => (a === b ? null : "The two passwords don't match"),
};
