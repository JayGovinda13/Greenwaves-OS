import { redirect } from 'next/navigation';

// O cadastro aberto foi substituído pelo agendamento de demonstração.
export default function SignupPage() {
  redirect('/demo');
}
