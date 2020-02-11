import axios from 'axios';
const API_KEY = process.env.REACT_APP_TOKEN;

const axiosWithAuth = () => {
    console.log('AXIOS TOKEN: ', API_KEY)
    return axios.create({
        headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_KEY}`
        }
    })
}

export default axiosWithAuth;