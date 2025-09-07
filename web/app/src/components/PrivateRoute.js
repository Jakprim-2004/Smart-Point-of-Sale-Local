import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const userType = localStorage.getItem('userType');
    const userLevel = localStorage.getItem('userLevel');

    // If user is an employee and tries to access protected routes
    if (userType === 'employee' && userLevel !== 'owner') {
        return <Navigate to="/sale" replace />;
    }

    return children;
};

export default PrivateRoute;
