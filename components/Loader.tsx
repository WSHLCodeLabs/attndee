/**
 * Loading Component - Attndee
 * 
 * Purpose: Smooth loading animation for page transitions
 */

export default function Loader() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="loader"></div>
      
      <style jsx>{`
        .loader {
          width: 32px;
          aspect-ratio: 1;
          --_g: no-repeat radial-gradient(farthest-side, #000 90%, #0000);
          background: var(--_g), var(--_g), var(--_g), var(--_g);
          background-size: 40% 40%;
          animation: l46 1s infinite;
        }
        
        @keyframes l46 {
          0% {
            background-position: 0 0, 100% 0, 100% 100%, 0 100%;
          }
          40%,
          50% {
            background-position: 100% 100%, 100% 0, 0 0, 0 100%;
          }
          90%,
          100% {
            background-position: 100% 100%, 0 100%, 0 0, 100% 0;
          }
        }
      `}</style>
    </div>
  );
}
