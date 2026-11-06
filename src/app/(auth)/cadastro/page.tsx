import { AuthForm } from '../AuthForm';

export const metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
