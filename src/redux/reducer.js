export const defaultState = {
    tempValue: null,
    tempList: [],
    isReady: false,
}

export default function reducer(state = defaultState, action) {
    switch(action.type) {
        case 'TEMP_ACTION':
            return {
                ...state,
            };
        default:
            return state;
    }
}
