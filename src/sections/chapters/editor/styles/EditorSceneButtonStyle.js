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

export const rightSidebarStyle = {
    position: 'absolute',
    top: '70px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 1001
};
