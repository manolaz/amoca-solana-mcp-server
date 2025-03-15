## Running the Project with Docker

To run this project using Docker, follow the steps below:

### Prerequisites

Ensure you have Docker and Docker Compose installed on your system. The project requires the following versions:

- **Node.js**: 22.14.0
- **pnpm**: 10.4.1

### Environment Variables

The project uses environment variables for configuration. Create a `.env` file in the root directory with the necessary variables. Refer to the `docker-compose.yml` file for required variables, such as:

- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password

### Build and Run

1. Build the Docker images and start the services:

   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:3000`.

### Services and Ports

- **Application**: Exposed on port `3000`
- **Database**: Internal service, not exposed externally

### Notes

- The application is built and served from the `dist` directory.
- Ensure the `.env` file is correctly configured before starting the services.

For further details, refer to the Dockerfile and Docker Compose configuration provided in the repository.