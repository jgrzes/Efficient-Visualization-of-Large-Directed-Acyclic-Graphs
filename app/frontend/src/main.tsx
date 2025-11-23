import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Import the provider directly. Including extension helps some tooling resolve .tsx modules.
// import FavoritesProvider from './hooks/useFavorites';


const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
	// <FavoritesProvider>
		<App />
	// </FavoritesProvider>
);
