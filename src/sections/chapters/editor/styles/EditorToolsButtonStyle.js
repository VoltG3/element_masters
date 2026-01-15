export const baseButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid #333',
    padding: '0 10px',
    height: '28px',
    backgroundColor: '#f0f0f0',
    marginRight: '5px',
    marginBottom: '5px',
    fontSize: '13px',
    color: '#000',
    borderRadius: '3px',
    userSelect: 'none',
    minWidth: '30px',
    boxSizing: 'border-box',
    textDecoration: 'none',
    lineHeight: 'normal',
    transition: 'all 0.2s ease'
};

export const baseActiveButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: '#aaa',
    borderColor: '#000',
    fontWeight: 'bold'
};

export const buttonStyle = { 
    ...baseButtonStyle,
    margin: 0,
    height: '28px',
    fontSize: '11px',
    padding: '0 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

export const activeButtonStyle = {
    ...baseActiveButtonStyle,
    margin: 0,
    height: '28px',
    fontSize: '11px',
    padding: '0 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

export const toolButtonStyle = {
    ...buttonStyle,
    width: '28px',
    height: '28px',
    padding: 0,
    fontSize: '16px'
};

export const activeToolButtonStyle = {
    ...activeButtonStyle,
    width: '28px',
    height: '28px',
    padding: 0,
    fontSize: '16px'
};

export const playButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderColor: '#388E3C'
};

export const pauseButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FF9800',
    color: '#fff',
    borderColor: '#F57C00'
};

export const panelHeaderStyle = {
    padding: '8px 15px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    height: '32px',
    boxSizing: 'border-box',
    color: '#333'
};
