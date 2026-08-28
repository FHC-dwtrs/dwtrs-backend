import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "DWTRS API",
      version: "1.0.0",
      description:
        "Document Workflow Tracking & Reporting System API",
    },

    servers: [
      {
        url: "/api/v1",
        description: "Local development server",
      },
    ],

    tags: [
      {
        name: "Auth",
        description: "Authentication APIs",
      },
      {
        name: "Cases",
        description: "Case management APIs",
      },
      {
        name: "Customers",
        description: "Customer management APIs",
      },
      {
        name: "Documents",
        description: "Document management APIs",
      },
      {
        name: "Workflow",
        description: "Case workflow and assignment APIs",
      },
      {
        name: "Organizations",
        description: "Organizational unit APIs",
      },
      {
        name: "Users",
        description: "User management APIs",
      },
      {
        name: "Notifications",
        description: "Notification APIs",
      },
      {
        name: "Reports",
        description: "Reporting APIs",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: [
    "./src/modules/**/*.routes.ts",
    "./src/modules/**/*.route.ts",
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);