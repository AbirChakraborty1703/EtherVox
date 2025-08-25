# Security Policy

## Supported Versions

We currently support the following versions of EtherVox with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in EtherVox, please report it responsibly:

### For Smart Contract Vulnerabilities:
- **DO NOT** create a public issue
- Email the maintainer directly with details
- Include steps to reproduce the vulnerability
- Provide a clear description of the impact

### For Application Vulnerabilities:
- Create a private security advisory on GitHub
- Include detailed reproduction steps
- Describe the potential impact

### Response Timeline:
- Initial response: Within 48 hours
- Vulnerability assessment: Within 7 days
- Fix deployment: Within 30 days (depending on severity)

## Security Best Practices

When using EtherVox:

1. **Environment Variables**: Never commit `.env` files containing sensitive information
2. **Private Keys**: Store private keys securely and never share them
3. **Network Security**: Use HTTPS in production environments
4. **Smart Contract Interaction**: Always verify contract addresses before interaction
5. **MetaMask Security**: Keep your MetaMask extension updated

## Security Features

EtherVox implements several security measures:

- JWT-based authentication
- Input validation and sanitization
- Smart contract access controls
- Secure environment variable handling
- CORS protection

## Responsible Disclosure

We follow responsible disclosure practices and will:

1. Acknowledge receipt of vulnerability reports
2. Work with reporters to understand and reproduce issues
3. Provide credit to reporters (unless anonymity is requested)
4. Notify users of security updates when appropriate

Thank you for helping keep EtherVox secure!
