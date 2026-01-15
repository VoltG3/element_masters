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

const baseActiveButtonStyle = {
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

export const headerBarStyle = {
    ...panelHeaderStyle,
    zIndex: 1000,
    position: 'relative'
};

export const toolsGroupStyle = {
    display: 'flex',
    gap: '8px',
    borderRight: '1px solid #ddd',
    paddingRight: '8px',
    marginRight: '4px',
    alignItems: 'center'
};

export const toolsInnerGroupStyle = {
    display: 'flex',
    gap: '2px',
    marginLeft: '5px',
    paddingLeft: '5px',
    borderLeft: '1px solid #ddd'
};

export const layerIndicatorStyle = {
    padding: '0 8px',
    height: '28px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '9px',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginRight: '8px',
    whiteSpace: 'nowrap',
    border: '1px solid'
};

export const brushSizeButtonStyle = {
    ...buttonStyle,
    width: '28px',
    height: '28px',
    padding: 0,
    justifyContent: 'center',
    fontSize: '13px'
};

export const activeBrushSizeButtonStyle = {
    ...activeButtonStyle,
    width: '28px',
    height: '28px',
    padding: 0,
    justifyContent: 'center',
    fontSize: '13px'
};

export const confirmButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: '#fff',
    borderColor: '#218838'
};

export const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: '#fff',
    borderColor: '#c82333'
};

export const bgColorContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginLeft: '4px',
    paddingLeft: '8px',
    borderLeft: '1px solid #ddd'
};

export const bgColorInputStyle = {
    width: '24px',
    height: '24px',
    border: '1px solid #333',
    padding: '1px',
    cursor: 'pointer',
    backgroundColor: '#fff',
    borderRadius: '3px',
    boxSizing: 'border-box'
};

export const infoContainerStyle = {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    color: '#666',
    marginLeft: 'auto'
};

export const infoItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
};

export const infoLabelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    opacity: 0.7
};

export const infoValueStyle = {
    color: '#000',
    fontSize: '12px'
};
