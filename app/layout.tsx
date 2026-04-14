import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import Providers from '../components/Providers';

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
		>
			<body className='h-full w-full m-0 p-0 overflow-x-hidden'>
				<Providers>
					<AntdRegistry>{children}</AntdRegistry>
				</Providers>
			</body>
		</html>
	);
}
