import { Router } from 'express';
import { listOrganizations, getOrganizationBySubdomain } from './org.controller';

export const orgRouter = Router();

orgRouter.get('/', listOrganizations);
orgRouter.get('/:subdomain', getOrganizationBySubdomain);