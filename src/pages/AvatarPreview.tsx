import StepExchangeSheet from '@/components/StepExchangeSheet';
const credits = Number(new URLSearchParams(location.search).get('c') ?? 50);
export default function AvatarPreview() { return <StepExchangeSheet open credits={credits} steps={1234} onConfirm={() => {}} onClose={() => {}} />; }
