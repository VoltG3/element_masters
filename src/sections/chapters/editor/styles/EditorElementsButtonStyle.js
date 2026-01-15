export const sidebarContainerStyle = {
    width: '60px',
    height: '100%',
    backgroundColor: '#222',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '10px',
    zIndex: 1001,
    borderRight: '1px solid #000',
    flexShrink: 0
};

export const sidebarButtonStyle = {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    marginBottom: '10px',
    fontSize: '20px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
};

export const activeSidebarButtonStyle = {
    ...sidebarButtonStyle,
    backgroundColor: '#2196F3',
    borderColor: '#1E88E5',
    transform: 'scale(1.05)'
};

export const panelContainerStyle = {
    width: '320px',
    height: '100%',
    backgroundColor: '#fff',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    zIndex: 1000,
    transition: 'width 0.2s ease'
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

export const panelBodyStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '15px'
};

export const closeButtonStyle = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 5px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const baseButtonStyle = {
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

export const buttonStyle = { ...baseButtonStyle };

export const operationButtonStyle = {
    ...buttonStyle,
    height: '40px',
    width: '100%',
    margin: 0,
    gap: '8px'
};
