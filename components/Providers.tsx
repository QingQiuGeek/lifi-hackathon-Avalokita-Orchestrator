'use client';

import { ThemeProvider } from 'next-themes';
import { XProvider } from '@ant-design/x';

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute='class'
			defaultTheme='light'
			enableSystem={false}
			themes={['light', 'dark']}
			disableTransitionOnChange
		>
			<XProvider>{children}</XProvider>
		</ThemeProvider>
	);
}

export default Providers;
