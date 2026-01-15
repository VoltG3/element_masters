import React from 'react';

export const WeatherPanel = ({
    weatherRain,
    setWeatherRain,
    weatherSnow,
    setWeatherSnow,
    weatherClouds,
    setWeatherClouds,
    weatherFog,
    setWeatherFog,
    weatherThunder,
    setWeatherThunder
}) => {
    const weatherItems = [
        { label: 'Rain', value: weatherRain, setter: setWeatherRain, icon: '🌧️' },
        { label: 'Snow', value: weatherSnow, setter: setWeatherSnow, icon: '❄️' },
        { label: 'Clouds', value: weatherClouds, setter: setWeatherClouds, icon: '☁️' },
        { label: 'Fog', value: weatherFog, setter: setWeatherFog, icon: '🌫️' },
        { label: 'Thunder', value: weatherThunder, setter: setWeatherThunder, icon: '⚡' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '5px' }}>
            {weatherItems.map((item) => (
                <div key={item.label} style={{ 
                    backgroundColor: '#f9f9f9', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #ddd' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                            {item.icon} {item.label}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2196F3' }}>
                            {item.value}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="1" 
                            value={item.value}
                            onChange={(e) => item.setter(parseInt(e.target.value))}
                            style={{ flex: 1, cursor: 'pointer' }} 
                        />
                    </div>
                </div>
            ))}
            <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '5px' }}>
                Weather effects will be visible in Play mode
            </div>
        </div>
    );
};
