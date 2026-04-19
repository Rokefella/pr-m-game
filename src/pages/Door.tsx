const Door = () => {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#04040a',
        maxWidth: 390,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <img
        src="/door.png"
        alt="Door"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
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
            fontSize: 18,
            color: '#e0ddd5',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          See you on the other side?
        </p>

        <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
          <button
            className="font-cinzel"
            style={{
              background: '#c8963a',
              color: '#04040a',
              padding: '10px 22px',
              fontSize: 11,
              letterSpacing: '0.28em',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            YES
          </button>
          <button
            className="font-cinzel"
            style={{
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
            STAY
          </button>
        </div>
      </div>
    </div>
  );
};

export default Door;
