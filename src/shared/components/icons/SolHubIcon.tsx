export function SolHubIcon({
  fill = '#000',
  className = '',
}: {
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      id='Capa_1'
      data-name='Capa 1'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 500 500'
      className={className}
    >
      <defs>
        <style>
          {`.cls-1 {
        fill: ${fill};
        stroke-width: 0px;
      }`}
        </style>
      </defs>
      <path
        className='cls-1'
        d='M88.26,341.01h-3.59c-15.43,0-27.94,12.51-27.94,27.94v77.04h80.64c15.43,0,27.94-12.51,27.94-27.94h0c0-42.37-34.67-77.04-77.04-77.04Z'
      />
      <path
        className='cls-1'
        d='M165.3,162.58h93.26v1.6c0,42.71,34.73,77.44,77.04,77.44h6.08c3.91-77.09,43.05-144.85,101.61-187.62H133.76c-42.31,0-77.04,34.33-77.04,77.04v31.54c0,229.93,247.9,134.53,247.9,255.88v27.54h108.58v-27.54c0-208.38-247.9-124.55-247.9-255.88Z'
      />
    </svg>
  );
}

export default SolHubIcon;
