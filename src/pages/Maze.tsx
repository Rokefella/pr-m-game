import { useNavigate } from 'react-router-dom';

const Maze = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <p
        className="font-fell italic"
        style={{
          fontSize: 16,
          color: 'rgba(160,140,200,0.7)',
          textAlign: 'center',
          margin: 0,
        }}
      >
        The maze is not yet open.
      </p>
      <button
        className="font-cinzel"
        onClick={() => navigate('/village')}
        style={{
          position: 'absolute',
          bottom: 40,
          background: 'transparent',
          color: '#9a9890',
          padding: '10px 22px',
          fontSize: 11,
          letterSpacing: '0.28em',
          border: '0.5px solid #5a5855',
          borderRadius: 0,
          cursor: 'pointer',
        }}
      >
        BACK
      </button>
    </div>
  );
};

export default Maze;
