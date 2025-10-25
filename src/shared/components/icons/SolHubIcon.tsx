export function SolHubIcon({ className = '' }: { className?: string }) {
	return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={`lucide lucide-code-xml-icon lucide-code-xml text-labPrimary ${className}`}
    >
      <path d='m18 16 4-4-4-4' />
      <path d='m6 8-4 4 4 4' />
      <path d='m14.5 4-5 16' />
    </svg>
  );
}

export default SolHubIcon

