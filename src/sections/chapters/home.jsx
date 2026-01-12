import React from 'react'
import styled from 'styled-components'
import config from '../../config'

const HomeContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    //background-color: darkred;
    
    .logoRow{
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        height: auto;
        margin: 10px;
        //border: solid 1px red;
        
        & img {
            width: 350px;
        }
    }
`

export default function Home() {
    const LOGO_01 = config.logo.URL_LOGO_01
    const LOGO_02 = config.logo.URL_LOGO_02
    const LOGO_03 = config.logo.URL_LOGO_03
    const LOGO_04 = config.logo.URL_LOGO_04
    const LOGO_05 = config.logo.URL_LOGO_05
    console.log(LOGO_01, LOGO_02, LOGO_03, LOGO_04, LOGO_05)

    return (
        <HomeContainer>
           <div className={"logoRow"}>
               <img src={LOGO_01} alt="logo" />
               <img src={LOGO_02} alt="logo" />
               <img src={LOGO_03} alt="logo" />
               <img src={LOGO_04} alt="logo" />

           </div>
        </HomeContainer>
    )
}
