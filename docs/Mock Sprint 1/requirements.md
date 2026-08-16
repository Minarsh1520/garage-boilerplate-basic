# Requirements — Team Page & Login Styling
**Task:** [Login Restyling Bootstrap] Task 1 — Write Requirements: Team Page & Login Styling
**Owner:** Scarlett Heng (Business Analyst)
**Status:** Done 

## Overview

This document defines the business and functional requirements for the Team Page and Login Page styling as part of the Task 2 Mock Sprint.

The requirements guide the UX design and development work while keeping the existing login functionality unchanged.

## Login Page Requirements

The Login Page is **styling only**.

- Existing authentication/login logic must remain unchanged.
- Existing Firebase authentication configuration must remain unchanged.
- Existing validation and security logic must remain unchanged.
- Existing session and user account behaviour must remain unchanged.
- Email, password and login controls should remain clear and easy to use.
- Buttons, labels and headings should use consistent styling.
- Appropriate spacing and readable text should be maintained.
- The page should remain usable across common desktop and mobile screen sizes.
- Accessibility should be considered through readable text, sufficient contrast, spacing and clear controls.


## Team Page Requirements

The Team Page must clearly display:

- Team name
- Project name
- Member photo
- Member name
- Member role
- Short/about-us blurb

Each team member should use a consistent card/layout structure: 

**Photo – Name – Role – Short Blurb**

The page should allow users to quickly identify the project team and understand each member's role.

## Display & Validation Rules

- Member names and roles must be clearly displayed.
- Member photos should use a consistent size and format.
- A placeholder/default avatar should be displayed when a photo is unavailable.
- Longer names and blurbs must wrap correctly without breaking the layout.
- Missing optional information must not break the page.
- Team member cards should follow a consistent layout.
- The Team Page should remain readable on common desktop and mobile screen sizes.
- Text should have sufficient contrast and appropriate readability.

## Edge Cases

The UX design and development should account for:

- **Missing member photo:** display a default/placeholder avatar.
- **Long member name:** name remains readable without breaking the layout.
- **Long blurb:** text wraps correctly without overlapping other content.
- **Missing blurb:** card/page continues to display correctly.
- **Different screen sizes:** Login and Team Pages remain readable and usable.
- **Incorrect login details:** existing error handling remains unchanged.
- **Empty login fields:** existing validation behaviour remains unchanged.
- **Long email address:** email remains within the input area without breaking the layout.
  
## Out of Scope

The following are outside the scope of this Mock Sprint:

- Authentication changes
- Firebase configuration changes
- Session behaviour changes
- New login functionality
- Backend development
- AI Assistant functionality
- Additional application pages

## Acceptance Criteria

The requirements are considered successfully implemented when:

1. Team name and project name are clearly displayed.
2. Each team member displays their photo, name, role and short blurb.
3. Team member information uses a consistent layout and styling.
4. A placeholder is displayed when a member photo is unavailable.
5. Long names and blurbs do not break the layout.
6. The Login Page is visually restyled while existing functionality remains unchanged.
7. Existing authentication, validation and session behaviour continue to work.
8. Login fields, labels and buttons remain clear and understandable.
9. Login and Team Pages remain readable across common screen sizes.
10. Text and interactive elements provide appropriate readability and accessibility.
11. No new backend or Firebase authentication functionality is introduced.
12. The completed implementation matches the BA requirements and approved UX design.

## Handoff Note

**To:** UX (Arman)

The requirements above should be used to validate the Team Page and Login Page designs before development.

Particular attention should be given to missing photos, long names, long blurbs, responsive layouts and accessibility.

## Deliverable

Final BA requirements documented and committed to the team repository.
