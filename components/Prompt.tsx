import {
	CoffeeOutlined,
	FireOutlined,
	SmileOutlined,
	BulbOutlined,
	InfoCircleOutlined,
	WarningOutlined,
	CheckCircleOutlined,
	RocketOutlined,
} from '@ant-design/icons';
import { Prompts } from '@ant-design/x';
import type { PromptsProps } from '@ant-design/x';

const promptItems: PromptsProps['items'] = [
	{
		key: '1',
		icon: <BulbOutlined style={{ color: '#FFD700' }} />,
		description: 'Find 5%+ APY vault on Base',
	},
	{
		key: '2',
		icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />,
		description: 'Arbitrum vs Optimism yields',
	},
	{
		key: '3',
		icon: <WarningOutlined style={{ color: '#FF4D4F' }} />,
		description: 'Bridge ETH→Base & fees',
	},
	{
		key: '4',
		icon: <RocketOutlined style={{ color: '#722ED1' }} />,
		description: 'Auto-rebalance on APY changes',
	},
	{
		key: '5',
		icon: <CheckCircleOutlined style={{ color: '#52C41A' }} />,
		description: 'Best USDC vaults by APY',
	},
	{
		key: '6',
		icon: <CoffeeOutlined style={{ color: '#964B00' }} />,
		description: 'Move Polygon assets cross-chain',
	},
];

interface PromptProps {
	onItemClick?: (prompt: string) => void;
}

const Prompt = ({ onItemClick }: PromptProps) => (
	<div className='flex items-center justify-center flex-1'>
		<div className='w-full'>
			<Prompts
				title='Ask the LI.FI Agent:'
				items={promptItems}
				wrap
				onItemClick={({ data }) => {
					if (onItemClick && data?.description) {
						onItemClick(String(data.description));
					}
				}}
			/>
		</div>
	</div>
);

export default Prompt;
