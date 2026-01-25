import React from 'react';
import { useTranslation } from 'react-i18next';

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
    setWeatherThunder,
    weatherLavaRain,
    setWeatherLavaRain,
    weatherRadioactiveFog,
    setWeatherRadioactiveFog,
    weatherMeteorRain,
    setWeatherMeteorRain
}) => {
    const { t } = useTranslation('editor_scene');
    const weatherItems = [
        { label: t('EDITOR_SCENE_WEATHER_RAIN'), value: weatherRain, setter: setWeatherRain, icon: '🌧️' },
        { label: t('EDITOR_SCENE_WEATHER_LAVA_RAIN'), value: weatherLavaRain, setter: setWeatherLavaRain, icon: '🔥' },
        { label: t('EDITOR_SCENE_WEATHER_SNOW'), value: weatherSnow, setter: setWeatherSnow, icon: '❄️' },
        { label: t('EDITOR_SCENE_WEATHER_METEOR_RAIN'), value: weatherMeteorRain, setter: setWeatherMeteorRain, icon: '☄️' },
        { label: t('EDITOR_SCENE_WEATHER_CLOUDS'), value: weatherClouds, setter: setWeatherClouds, icon: '☁️' },
        { label: t('EDITOR_SCENE_WEATHER_FOG'), value: weatherFog, setter: setWeatherFog, icon: '🌫️' },
        { label: t('EDITOR_SCENE_WEATHER_RADIO_FOG'), value: weatherRadioactiveFog, setter: setWeatherRadioactiveFog, icon: '☢️' },
        { label: t('EDITOR_SCENE_WEATHER_THUNDER'), value: weatherThunder, setter: setWeatherThunder, icon: '⚡' },
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
                {t('EDITOR_SCENE_WEATHER_HINT')}
            </div>
        </div>
    );
};
