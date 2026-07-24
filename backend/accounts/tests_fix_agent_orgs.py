"""Tests de la migration 0027 (réconciliation de l'organisation des agents).

Les agents de démo ne sont plus créés par les migrations (`projects.0003_seed_agent_projects` a
été neutralisée : aucune donnée de test n'est générée). Ces tests créent donc explicitement les
comptes agents ET une adhésion « parasite » vers une autre organisation, afin de valider la
logique de réconciliation de la migration 0027 (une unique adhésion active « Agent » vers la
bonne organisation)."""
import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Membership, Organization

User = get_user_model()

_mig = importlib.import_module('accounts.migrations.0027_fix_agent_organizations')
fix_agent_organizations = _mig.fix_agent_organizations

TARGET = {
    'agent1@sdgps.ma': 'SC-AZILAL',
    'agent2@sdgps.ma': 'SC-HAOUZ',
    'agent3@sdgps.ma': 'ITKANTOPO-V2',
}


def _ensure_target_orgs():
    for code in set(TARGET.values()):
        Organization.all_objects.get_or_create(
            code=code, defaults={'name': code, 'type': 'PUBLIC'})


def _ensure_agents_with_parasite_membership():
    """Crée agent1/2/3 + une adhésion vers une organisation « parasite » à nettoyer par 0027."""
    parasite, _ = Organization.all_objects.get_or_create(
        code='T-ORG-PARASITE',
        defaults={'name': 'Parasite', 'type': 'PRIVATE', 'is_test_data': True})
    for email in TARGET:
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(username=email, email=email, password='Test@2026')
        Membership.objects.get_or_create(
            user=user, organization=parasite,
            defaults={'role': 'ROLE_ORGANISATION_AGENT', 'is_active': True})


class FixAgentOrganizationsTests(TestCase):
    def test_reconcilie_les_trois_agents(self):
        _ensure_agents_with_parasite_membership()
        _ensure_target_orgs()
        fix_agent_organizations(django_apps, None)
        for email, code in TARGET.items():
            agent = User.objects.get(email=email)
            mems = list(Membership.objects.filter(user=agent))
            self.assertEqual(len(mems), 1, email)
            self.assertEqual(mems[0].organization.code, code, email)
            self.assertTrue(mems[0].is_active, email)
            self.assertEqual(mems[0].role, 'ROLE_ORGANISATION_AGENT', email)

    def test_idempotent(self):
        _ensure_agents_with_parasite_membership()
        _ensure_target_orgs()
        fix_agent_organizations(django_apps, None)
        fix_agent_organizations(django_apps, None)
        agent = User.objects.get(email='agent1@sdgps.ma')
        self.assertEqual(Membership.objects.filter(user=agent).count(), 1)
        self.assertEqual(
            Membership.objects.get(user=agent).organization.code, 'SC-AZILAL')

    def test_noop_si_org_cible_absente(self):
        _ensure_agents_with_parasite_membership()
        # Sans créer les orgs cibles : les agents ne sont pas modifiés (garde-fou).
        agent = User.objects.get(email='agent1@sdgps.ma')
        before = Membership.objects.filter(user=agent).count()
        fix_agent_organizations(django_apps, None)
        self.assertEqual(Membership.objects.filter(user=agent).count(), before)
