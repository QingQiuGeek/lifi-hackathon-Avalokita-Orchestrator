import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
	mainnet,
	base,
	arbitrum,
	polygon,
	optimism,
	sepolia,
	baseSepolia,
	arbitrumSepolia,
} from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
	appName: 'LI.FI Earn Agent',
	projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'default_project_id',
	chains: [
		mainnet,
		base,
		arbitrum,
		polygon,
		optimism,
		sepolia,
		baseSepolia,
		arbitrumSepolia,
	],
	ssr: true,
});
