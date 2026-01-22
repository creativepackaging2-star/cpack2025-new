import { redirect } from 'next/navigation';

export default function Dashboard() {
  redirect('/orders');

  return null;
}
